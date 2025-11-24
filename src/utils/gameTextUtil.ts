/**
 * Convert a string text with the color prefix "&" into Minecraft-style formatted HTML.
 */

import { ReactNode, createElement } from "react";

export class MinecraftTextUtil {
    static colorCodeMap: { [code: string]: string } = {
        '0': '#000000',
        '1': '#0000AA',
        '2': '#00AA00',
        '3': '#00AAAA',
        '4': '#AA0000',
        '5': '#AA00AA',
        '6': '#FFAA00',
        '7': '#AAAAAA',
        '8': '#555555',
        '9': '#5555FF',
        'a': '#55FF55',
        'b': '#55FFFF',
        'c': '#FF5555',
        'd': '#FF55FF',
        'e': '#FFFF55',
        'f': '#FFFFFF',
    };

    static formatText(input: string): ReactNode {
        const elements: ReactNode[] = [];
        
        let currentColor: string | null = null;
        let isBold = false;
        let isItalic = false;
        let isUnderlined = false;
        let isStrikethrough = false;
        let isObfuscated = false;

        let buffer = '';
        let keyIndex = 0;

        const flush = () => {
            if (buffer.length === 0) return;
            
            const classNames: string[] = [];
            if (currentColor) classNames.push(`mc-${currentColor}`);
            if (isBold) classNames.push('mc-l');
            if (isItalic) classNames.push('mc-o');
            if (isUnderlined) classNames.push('mc-n');
            if (isStrikethrough) classNames.push('mc-m');
            if (isObfuscated) classNames.push('mc-k');
            
            const props: any = { key: keyIndex++ };
            if (classNames.length > 0) {
                props.className = classNames.join(' ');
            }
            
            elements.push(createElement('span', props, buffer));
            buffer = '';
        };

        for (let i = 0; i < input.length; i++) {
            if (input[i] === '&' && i + 1 < input.length) {
                const code = input[i + 1].toLowerCase();
                
                // Check if it is a valid code
                const isColor = "0123456789abcdef".includes(code);
                const isFormat = "klmnor".includes(code);
                
                if (isColor || isFormat) {
                    flush();
                    i++; // Skip the code char

                    if (isColor) {
                        currentColor = code;
                        // Reset formatting when color changes (Minecraft behavior)
                        isBold = false;
                        isItalic = false;
                        isUnderlined = false;
                        isStrikethrough = false;
                        isObfuscated = false;
                    } else {
                        switch (code) {
                            case 'l': isBold = true; break;
                            case 'm': isStrikethrough = true; break;
                            case 'n': isUnderlined = true; break;
                            case 'o': isItalic = true; break;
                            case 'k': isObfuscated = true; break;
                            case 'r': 
                                currentColor = null;
                                isBold = false;
                                isItalic = false;
                                isUnderlined = false;
                                isStrikethrough = false;
                                isObfuscated = false;
                                break;
                        }
                    }
                } else {
                    buffer += '&';
                }
            } else {
                buffer += input[i];
            }
        }
        flush();

        return createElement('span', null, elements);
    }
}