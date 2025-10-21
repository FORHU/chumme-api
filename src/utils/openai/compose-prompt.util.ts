export function composePrompt(userInput: string) {
  return `
  You are a helpful assistant. Analyze the message below and respond thoughtfully.
  
  Message: "${userInput}"
  
  Please respond with empathy and professionalism.
  `;
}
