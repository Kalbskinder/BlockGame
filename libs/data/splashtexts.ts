import { SplashTextEntry } from "../types/models";

export const splashTexts: SplashTextEntry[] = [
    { text: "Block Game!", fontSize: 2.2 },
    { text: "67!", fontSize: 2.2 },
    { text: "Three.js!", fontSize: 2.2 },
    { text: "crumb", fontSize: 2.2 },
    { text: "Hello World!", fontSize: 2.2 },
    { text: "helloWorld(\"print\");", fontSize: 1.8 },
];

export const getRandomSplashText = (): SplashTextEntry => {
    const index = Math.floor(Math.random() * splashTexts.length);
    return splashTexts[index];
}