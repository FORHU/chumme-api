export function detectEmotion(text: string) : string {
    const lower = text.toLowerCase();

    if(lower.includes('sorry') || lower.includes('apologize')) {
        return 'apologetic';
    } else if(lower.includes('thank you') || lower.includes('thanks')) {
        return 'grateful';
    } else if(lower.includes('happy') || lower.includes('joy')) {
        return 'happy';
    } else if(lower.includes('sad') || lower.includes('unhappy')) {
        return 'sad';
    } else if(lower.includes('angry') || lower.includes('frustrated')) {
        return 'angry';
    } else {
        return 'neutral';
    }
}