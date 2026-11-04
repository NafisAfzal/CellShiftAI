/**
 * CellShift synthetic radio PROXY model. Not an RF planning tool or measured coverage predictor.
 * Deterministic; zero network calls; no subscriber or network identifiers.
 */
export type SiteId = "cell-a" | "cell-b" | "cell-c" | "cell-d" | "cell-e";
export type Cell = { id: SiteId; name: string; x: number; y: number; powerDbm: number; capacityUsers: number };
export type UE = { id: string; x: number; y: number; demand: number };
export type Scenario = { modelVersion: string; cells: Cell[]; users: UE[] };
export type Change = { siteId: SiteId; deltaPowerDb: number };
export type UEState = { id: string; serving: SiteId | null; signalDbm: number; sinrDb: number; covered: boolean; rateProxy: number };
export type Metrics = { coveredUsers: number; coveragePct: number; avgSinrDb: number; avgRateProxy: number; overloadedCells: number; handovers: number; newlyUncovered: string[]; newlyCovered: string[]; associationChanges: string[]; highInterference: number };
export type Outcome = { baseline: Metrics; proposed: Metrics; delta: { coveragePct: number; avgSinrDb: number; avgRateProxy: number }; risk: "LOW" | "MODERATE" | "HIGH"; reasons: string[]; before: UEState[]; after: UEState[]; cellsAfter: Cell[]; change: Change; scenarioVersion: string; limitations: string[] };
const SITES: Cell[] = [
  {id:"cell-a",name:"North Gate",x:195,y:195,powerDbm:39,capacityUsers:27},
  {id:"cell-b",name:"Central Hub",x:550,y:350,powerDbm:38,capacityUsers:28},
  {id:"cell-c",name:"Harbor",x:820,y:230,powerDbm:40,capacityUsers:24},
  {id:"cell-d",name:"South Park",x:310,y:775,powerDbm:38,capacityUsers:25},
  {id:"cell-e",name:"Eastpoint",x:770,y:755,powerDbm:39,capacityUsers:26}
];
export const MODEL_VERSION = "synthetic-rf-proxy-v1.0";
export const LIMITATIONS = [
  "Synthetic topology and invented user locations; no operator or subscriber data.",
  "Simple urban-distance proxy; no calibrated propagation, terrain, antenna pattern or spectrum planning.",
  "Fixed-frequency co-channel interference proxy; no scheduler, mobility or live handover modeling.",
  "Throughput proxy is not a measured or guaranteed Mbps figure.",
  "All results require radio-engineer review; no real network configuration is changed."
];
function seededUsers(count: number): UE[] {
  let seed=29731;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return Array.from({length:count},(_,i)=>({id:`user-${String(i+1).padStart(3,"0")}`,x:65+rand()*870,y:65+rand()*870,demand:0.6+rand()*0.9}));
}
export function defaultScenario():Scenario {
  return {modelVersion:MODEL_VERSION,cells:SITES.map(x=>({...x})),users:seededUsers(100)};
}
export const SITE_IDS: SiteId[] = ["cell-a","cell-b","cell-c","cell-d","cell-e"];
export function validateChange(change: Change, scenario: Scenario):string | null {
  if (!change || !SITE_IDS.includes(change.siteId)) return "Unknown site ID";
  if (!Number.isFinite(change.deltaPowerDb) || Math.abs(change.deltaPowerDb)>6 || !Number.isInteger(change.deltaPowerDb)) return "Power change must be an integer between -6 and +6 dB";
  const cell=scenario.cells.find(c=>c.id===change.siteId);
  if(!cell)return "Cell not present in scenario";
  if(cell.powerDbm+change.deltaPowerDb<30 || cell.powerDbm+change.deltaPowerDb>46)return "Resulting power is outside demo limits (30–46 dBm)";
  return null;
}
function r2(x:number){return Math.round(x*100)/100;}
function dbmToLinear(x:number){return Math.pow(10,x/10);}
function linearToDb(x:number){return 10*Math.log10(Math.max(x,1e-14));}
function signalDbm(c:Cell,u:UE){
  const distanceKm=Math.max(.07,Math.hypot(c.x-u.x,c.y-u.y)/1000);
  const lossDb=128.1+37.6*Math.log10(distanceKm); // intentionally oversimplified urban-distance proxy
  return c.powerDbm+12-lossDb;
}
function evaluate(cells:Cell[],users:UE[]):{states:UEState[],loads:Map<SiteId,number>}{
  const first=users.map(u=>{
    const signals=cells.map(c=>({id:c.id,dbm:signalDbm(c,u)})).sort((a,b)=>b.dbm-a.dbm);
    const strongest=signals[0];
    const interference=signals.slice(1).reduce((t,x)=>t+dbmToLinear(x.dbm),dbmToLinear(-108));
    const sinr=linearToDb(dbmToLinear(strongest.dbm)/interference);
    const covered=strongest.dbm>=-70 && sinr>=0;
    return {id:u.id,serving:covered?strongest.id:null,signalDbm:r2(strongest.dbm),sinrDb:r2(sinr),covered,rateProxy:r2(Math.max(0,Math.min(30,2.6*Math.log2(1+dbmToLinear(sinr)))))} as UEState;
  });
  const loads=new Map<SiteId,number>(cells.map(c=>[c.id,0]));
  for(const u of first)if(u.serving)loads.set(u.serving,(loads.get(u.serving)??0)+1);
  const states=first.map(u=>{
    if(!u.serving)return u;
    const site=cells.find(c=>c.id===u.serving)!;
    const util=(loads.get(u.serving)??0)/site.capacityUsers;
    return {...u,rateProxy:r2(u.rateProxy*Math.max(.2,1-Math.max(0,util-.75)*.5))};
  });
  return {states,loads};
}
function summarize(result:ReturnType<typeof evaluate>,cells:Cell[],old?:UEState[]):Metrics{
  const covered=result.states.filter(u=>u.covered);
  const beforeMap=new Map(old?.map(u=>[u.id,u])??[]);
  const newlyUncovered=old?result.states.filter(u=>beforeMap.get(u.id)?.covered&&!u.covered).map(u=>u.id):[];
  const newlyCovered=old?result.states.filter(u=>!beforeMap.get(u.id)?.covered&&u.covered).map(u=>u.id):[];
  const associationChanges=old?result.states.filter(u=>beforeMap.get(u.id)?.serving!==u.serving).map(u=>u.id):[];
  return {
    coveredUsers:covered.length,coveragePct:r2(covered.length/result.states.length*100),
    avgSinrDb:r2(covered.length?covered.reduce((t,u)=>t+u.sinrDb,0)/covered.length:0),
    avgRateProxy:r2(covered.length?covered.reduce((t,u)=>t+u.rateProxy,0)/covered.length:0),
    overloadedCells:cells.filter(c=>(result.loads.get(c.id)??0)>c.capacityUsers).length,
    handovers:associationChanges.length,newlyUncovered,newlyCovered,associationChanges,
    highInterference:result.states.filter(u=>u.sinrDb<0).length
  };
}
export function simulate(scenario:Scenario, change:Change):Outcome {
  const issue=validateChange(change,scenario);
  if(issue)throw new Error(issue);
  const beforeModel=evaluate(scenario.cells,scenario.users);
  const changedCells=scenario.cells.map(c=>c.id===change.siteId?{...c,powerDbm:c.powerDbm+change.deltaPowerDb}:{...c});
  const afterModel=evaluate(changedCells,scenario.users);
  const base=summarize(beforeModel,scenario.cells);
  const after=summarize(afterModel,changedCells,beforeModel.states);
  const delta={coveragePct:r2(after.coveragePct-base.coveragePct),avgSinrDb:r2(after.avgSinrDb-base.avgSinrDb),avgRateProxy:r2(after.avgRateProxy-base.avgRateProxy)};
  const reasons:string[]=[];
  if(after.newlyUncovered.length>0)reasons.push(`${after.newlyUncovered.length} previously covered simulated users lose coverage`);
  if(delta.avgSinrDb < -1)reasons.push(`Mean covered-user SINR proxy falls by ${Math.abs(delta.avgSinrDb)} dB`);
  if(after.handovers>8)reasons.push(`${after.handovers} simulated users change cell association`);
  if(after.overloadedCells>base.overloadedCells)reasons.push(`Overloaded simulated cells increase from ${base.overloadedCells} to ${after.overloadedCells}`);
  if(after.newlyCovered.length>0)reasons.push(`${after.newlyCovered.length} simulated users gain coverage`);
  const risk:Outcome["risk"]=(after.newlyUncovered.length>=3||delta.avgSinrDb<-2||after.overloadedCells>=2)?"HIGH":(after.newlyUncovered.length>0||delta.avgSinrDb<-.6||after.handovers>=5)?"MODERATE":"LOW";
  return {baseline:base,proposed:after,delta,risk,reasons:reasons.length?reasons:["No guardrail threshold crossed in this synthetic sample"],before:beforeModel.states,after:afterModel.states,cellsAfter:changedCells,change,scenarioVersion:scenario.modelVersion,limitations:LIMITATIONS};
}
export function safetyCase(outcome:Outcome){
  const rows=[
    `Coverage proxy: ${outcome.baseline.coveragePct}% → ${outcome.proposed.coveragePct}% (${outcome.delta.coveragePct>=0?"+":""}${outcome.delta.coveragePct} pp).`,
    `Mean SINR proxy: ${outcome.baseline.avgSinrDb} → ${outcome.proposed.avgSinrDb} dB (${outcome.delta.avgSinrDb>=0?"+":""}${outcome.delta.avgSinrDb} dB).`,
    `Cell re-associations: ${outcome.proposed.handovers}; newly uncovered: ${outcome.proposed.newlyUncovered.length}; newly covered: ${outcome.proposed.newlyCovered.length}.`
  ];
  return {
    headline:outcome.risk==="HIGH"?"High review priority":outcome.risk==="MODERATE"?"Engineering review recommended":"No triggered demo guardrail",
    observations:rows, checks:["Check real neighbor-cell KPIs, antenna configuration and interference measurements before any decision.","Confirm user impact, busiest-hour load and approved change window using operator-authorized data."],
    rollback:["Record existing parameter value and approved rollback owner.","Set measurable abort conditions and verify rollback procedure before a real maintenance window."],
    limitation:"Synthetic proxy only; no field validation or automated deployment."};
}
