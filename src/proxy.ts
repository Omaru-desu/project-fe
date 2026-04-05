
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session";

const protectedRoutes = ["/dashboard", "/projects"];
const publicRoutes = ["/login"];

export default async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.includes(path);
    const isPublicRoute = publicRoutes.includes(path);

    const token = req.cookies.get("auth_token")?.value;
    const session = await verifySessionToken(token);

    if (isProtectedRoute && !session?.uid) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (isPublicRoute && session?.uid) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    return NextResponse.next();
}