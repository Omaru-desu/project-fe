"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

// const sampleUser = {
//     id: "1",
//     email: "omaru@gmail.com",
//     password: "omarutidur1",
// };

export async function getAnnotations() {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch("http://your-fastapi/api/annotations", {
        headers: {
            Authorization: `Bearer ${session?.access_token}`
        }
    })

    return res.json()
}

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

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
    })

    if (error) return { errors: { email: ["Invalid email or password"] } }

    redirect("/projects")
}

export async function logout() {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
    redirect("/login")
}

export async function register(prevState: unknown, formData: FormData) {
    const result = registerSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return { errors: result.error.flatten().fieldErrors };
    }

    const { firstName, lastName, email, org, password } = result.data;
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { first_name: firstName, last_name: lastName, org }
        }
    })

    if (error) return { errors: { email: [error.message] } }

    redirect("/projects");
}