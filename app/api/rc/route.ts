import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { VehicleServiceError, fetchVehicleRecord, isValidRegistrationNumber, normalizeRegistrationNumber } from "@/lib/vehicle-service";
export const runtime = "nodejs";
function clientKey(request: Request) { const forwarded=request.headers.get("x-forwarded-for"); const ip=forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; return createHash("sha256").update(ip).digest("hex").slice(0,40); }
async function consumeFreeCheck(request: Request) {
 const url=process.env.UPSTASH_REDIS_REST_URL; const token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url || !token) throw new Error("Free RC check limit is not configured. Please contact support.");
 const key="vahan:free-rc:v1:"+clientKey(request); const base=url.replace(/\/$/,"");
 const response=await fetch(base+"/pipeline",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify([["INCR",key],["EXPIRE",key,"86400"]]),cache:"no-store"});
 if(!response.ok) throw new Error("Free RC check service is temporarily unavailable.");
 const data=await response.json(); const count=Number(data?.[0]?.result); if(!Number.isFinite(count)) throw new Error("Free RC check service returned an invalid response.");
 const ttlResponse=await fetch(base+"/ttl/"+encodeURIComponent(key),{headers:{Authorization:"Bearer "+token},cache:"no-store"}); const ttlData=ttlResponse.ok?await ttlResponse.json():null; const ttl=Number(ttlData?.result);
 return {allowed:count<=3,remaining:Math.max(0,3-count),retryAfter:Number.isFinite(ttl)&&ttl>0?ttl:86400};
}
export async function POST(request: Request) {
 try {
  const body=await request.json().catch(()=>null); if(!body||typeof body!=="object"||Array.isArray(body)) return NextResponse.json({error:"Invalid request."},{status:400});
  const registrationNumber=normalizeRegistrationNumber(typeof body.registrationNumber==="string"?body.registrationNumber:"");
  if(!registrationNumber||!isValidRegistrationNumber(registrationNumber)) return NextResponse.json({error:"A valid registration number is required.",code:"RC_INVALID_REGISTRATION_NUMBER"},{status:400});
  const quota=await consumeFreeCheck(request);
  if(!quota.allowed) return NextResponse.json({error:"You have used all 3 free RC checks for this 24-hour period. Please try again after the limit resets.",code:"RC_FREE_LIMIT_REACHED",remaining:0},{status:429,headers:{"Retry-After":String(quota.retryAfter),"Cache-Control":"no-store, private"}});
  const chassisNumber=typeof body.chassisNumber==="string"?body.chassisNumber.trim():undefined; const engineNumber=typeof body.engineNumber==="string"?body.engineNumber.trim():undefined;
  const result=await fetchVehicleRecord({registrationNumber,...(chassisNumber?{chassisNumber}:{}),...(engineNumber?{engineNumber}:{})});
  return NextResponse.json({result,freeChecksRemaining:quota.remaining},{headers:{"Cache-Control":"no-store, private, max-age=0"}});
 } catch(error) {
  if(error instanceof VehicleServiceError) return NextResponse.json({error:error.message,code:error.code},{status:error.statusCode>=500?503:error.statusCode});
  return NextResponse.json({error:error instanceof Error?error.message:"Unable to verify vehicle details."},{status:503});
 }
}