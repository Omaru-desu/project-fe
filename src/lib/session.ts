import "server-only";

import { JWTPayload, SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_KEY = "auth_token";
const SESSION_DAYS = 7;

export async function createUserSession(userId: string) {
    const expiryDate = buildExpiryDate();

    const token = await generateToken({
        uid: userId,
    });

    const cookieStore = await cookies();

    cookieStore.set(COOKIE_KEY, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiryDate,
        path: "/",
    });
}

function getJwtSecret() {
    const secret = process.env.SESSION_SECRET;

    if (!secret) {
        throw new Error("SESSION_SECRET is not defined");
    }

    return new TextEncoder().encode(secret);
}

export type AuthTokenPayload = JWTPayload & {
    uid: string;
};

function buildExpiryDate() {
    return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}


export async function clearUserSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_KEY);
}

async function generateToken(payload: AuthTokenPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DAYS}d`)
        .sign(getJwtSecret());
}

export async function verifySessionToken(token?: string) {
    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, getJwtSecret(), {
            algorithms: ["HS256"],
        });

        return payload as AuthTokenPayload;
    } catch (error) {
        console.error("Failed to verify session token:", error);
        return null;
    }
}