import React from "react";
import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const dmSans = DM_Sans({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-dm-mono",
});

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
    subsets: ["latin"],
    weight: ["500", "600"],
    style: ["normal", "italic"],
    variable: "--font-source-serif",
});

export const metadata: Metadata = {
    title: "OMarine",
    description: "AI underwater annotation platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${dmSans.variable} ${dmMono.variable} ${sourceSerif.variable} ${inter.variable} font-sans antialiased`}>
                <Navbar />
                {children}
            </body>
        </html>
    );
}
