"use server";

import { z } from "zod";
import { createUserSession, clearUserSession } from "../../lib/session";
import { redirect } from "next/navigation";

const sampleUser = {
    id: "1",
    email: "omaru@gmail.com",
    password: "omaru123",
};

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address or password" }).trim(),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" })
        .trim(),
});

const registerSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }).trim(),
    lastName: z.string().min(1, { message: "Last name is required" }).trim(),
    email: z.string().email({ message: "Invalid email address" }).trim(),
    org: z.string().min(1, { message: "Organisation is required" }).trim(),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }).trim(),
});

export async function login(prevState: unknown, formData: FormData) {
    // Validate input
    const result = loginSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors,
        };
    }

    const { email, password } = result.data;

    const isCorrectUser =
        email === sampleUser.email && password === sampleUser.password;

    if (!isCorrectUser) {
        return {
            errors: {
                email: ["Invalid email or password"],
            },
        };
    }

    await createUserSession(sampleUser.id);

    redirect("/dashboard");
}

export async function logout() {
    await clearUserSession();
    redirect("/login");
}

export async function register(prevState: unknown, formData: FormData) {
    const result = registerSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors,
        };
    }

    await createUserSession("2");
    redirect("/dashboard");
}