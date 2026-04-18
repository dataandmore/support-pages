import { ServerClient } from "postmark"

if (!process.env.POSTMARK_API_KEY && process.env.NODE_ENV === "production") {
  throw new Error("POSTMARK_API_KEY is not set")
}

const client = new ServerClient(process.env.POSTMARK_API_KEY ?? "POSTMARK_API_TEST")

const FROM_EMAIL = "support@dataandmore.com"
const PRODUCT_NAME = "Data & More Support Portal"

export async function sendUserInvite(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  await client.sendEmailWithTemplate({
    From: FROM_EMAIL,
    To: to,
    TemplateAlias: "user-invite",
    TemplateModel: {
      name,
      temp_password: tempPassword,
      login_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/en/login`,
      product_name: PRODUCT_NAME,
    },
  })
}

export async function sendPasswordReset(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  await client.sendEmailWithTemplate({
    From: FROM_EMAIL,
    To: to,
    TemplateAlias: "password-reset",
    TemplateModel: {
      name,
      reset_url: resetUrl,
      product_name: PRODUCT_NAME,
    },
  })
}

export async function sendWelcome(to: string, name: string): Promise<void> {
  await client.sendEmailWithTemplate({
    From: FROM_EMAIL,
    To: to,
    TemplateAlias: "welcome",
    TemplateModel: {
      name,
      login_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/en/login`,
      product_name: PRODUCT_NAME,
    },
  })
}
