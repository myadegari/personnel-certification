import crypto from "crypto";

export function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOtp(inputOtp, storedHash) {
  const inputHash = hashOtp(inputOtp);
  if (inputHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
}