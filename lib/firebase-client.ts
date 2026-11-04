/** OPTIONAL browser-side persistence of *synthetic change metadata only*.
 * Enabled only when all Firebase vars are configured and user opts in.
 * Rules enforce owner access; NOT a server-side authorization system.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, limit, orderBy, query } from "firebase/firestore";
import type { Change } from "./simulation";

export function firebaseEnabled(){
  return process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true" &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
}
function app(){
  if(!firebaseEnabled()) throw new Error("Firebase is not configured; local session still works.");
  if(getApps().length)return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
  });
}
export async function saveSyntheticChange(change:Change):Promise<string>{
  const a=app(); const auth=getAuth(a);
  if(!auth.currentUser) await signInAnonymously(auth);
  const uid=auth.currentUser?.uid;
  if(!uid)throw new Error("Firebase anonymous sign-in did not complete");
  const db=getFirestore(a);
  const ref=await addDoc(collection(db,"users",uid,"runs"),{
    siteId:change.siteId,deltaPowerDb:change.deltaPowerDb,
    modelVersion:"synthetic-rf-proxy-v1.0",createdAt:serverTimestamp()
  });
  return ref.id;
}
export async function countSavedRuns():Promise<number>{
  const a=app(); const auth=getAuth(a);if(!auth.currentUser)return 0;
  const snap=await getDocs(query(collection(getFirestore(a),"users",auth.currentUser.uid,"runs"),orderBy("createdAt","desc"),limit(10)));
  return snap.size;
}
