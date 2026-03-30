import fs from "fs";
import path from "path";
import { sendEmail } from "./mailer";

/**
 
Sends a templated email using the specified parameters.*
@param {Object} params - The parameters for sending the email.
@param {string} params.template_name - The name of the email template to use.
@param {string} params.subject - The subject of the email.
@param {Object} params.email_data - The data to populate the email template.
@param {Array} [params.attachments=[]] - Optional attachments to include in the email.
@param {string|null} [params.cc=null] - Optional CC recipient for the email.*/
export const sendTemplatedEmail = ({
  template_name,
  subject,
  email_data,
  cc = null,
}: any) => {
  const html = getHTMLContents({ template_name, email_data });

  handleSendEmail({
    to: email_data.email,
    subject,
    html,
    cc,
  });
};

export const handleSendEmail = ({ to, subject, html }: any) => {
  /**
     
  Adds a job to the email queue to send an email verification email to the user.
  @param {string} to - The email address to send the verification email to.
  @param {string} subject - The subject of the verification email.
  @param {string} html - The HTML content of the verification email.*/

  sendEmail({
    to,
    subject,
    html,
  });
};

/**
 
Generates HTML content by replacing placeholders in an email template with provided data.*
@param {Object} params - The parameters for generating the HTML content.
@param {string} params.template_name - The name of the email template file.
@param {Object} params.email_data - An object containing key-value pairs where the key is the placeholder in the template and the value is the data to replace it with.
@returns {string} The generated HTML content with placeholders replaced by the provided data.*/

export const getHTMLContents = ({ template_name, email_data }: any): string => {
  const filePath = path.join(process.cwd(), `email-template/${template_name}`);
  let html = fs.readFileSync(filePath, "utf8");
  for (const key in email_data) {
    const placeholder = `{{${key}}}`;
    html = html.replace(new RegExp(placeholder, "g"), email_data[key]);
  }
  return html;
};

export const stringBacktickToArray = (input: string = ""): string[] => {
  return input
    .replace(/"/g, "")
    .split(",")
    .map((id: any) => id.trim());
};

export const ACTIONS = {
  ADD: "add",
  REMOVE: "remove",
  UPDATE: "update",
} as const;

export const getTimeStamp = (): string => {
  const now = new Date();
  return `${(now.getMonth() + 1).toString().padStart(2, "0")}-${now
    .getDate()
    .toString()
    .padStart(2, "0")}-${now.getFullYear()}-${now
    .getHours()
    .toString()
    .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
};

export const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const seededShuffle = <T>(array: T[], seed: string): T[] => {
  if (!seed) return shuffleArray(array);

  // Simple hash for seed string to get numeric seeds
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }

  // sfc32 PRNG (Small Fast Counter)
  let a = h ^ 0xdeadbeef;
  let b = h ^ 0x41534b41;
  let c = h ^ 0xbeefface;
  let d = h ^ 0x8badf00d;

  const rand = () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
