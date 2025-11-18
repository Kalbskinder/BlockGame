import { SplashTextEntry } from "../../src/types/models";

export const splashTexts: SplashTextEntry[] = [
    { text: "Block Game!", fontSize: 2.2 },
    { text: "67!", fontSize: 2.2 },
    { text: "Three.js!", fontSize: 2.2 },
    { text: "crumb", fontSize: 2.2 },
    { text: "Hello World!", fontSize: 2.2 },
    { text: "Kalbskinder", fontSize: 2.2 },
    { text: "Typescript", fontSize: 2.2 },
    { text: "skinview3d", fontSize: 2.2 },
    { text: "Browser Edition", fontSize: 1.9 },
    { text: "Uhm... Guys?", fontSize: 2.0 },
    { text: "helloWorld(\"print\");", fontSize: 1.8 },
    { text: "So blocky it hurts", fontSize: 1.8 },
    { text: "Open Source!", fontSize: 2.0 },
    { text: "Blocks > Spheres", fontSize: 1.9 },
    { text: "no bugs!* (*probably)", fontSize: 1.8 },
    
    
];

export const getRandomSplashText = (): SplashTextEntry => {
    const index = Math.floor(Math.random() * splashTexts.length);
    return splashTexts[index];
}