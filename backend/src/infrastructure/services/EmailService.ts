import nodemailer from "nodemailer";

import { env } from "../../config/env";

type SendResult = {
  sent: boolean;
  reason?: string;
};

export class EmailService {
  async sendResetPasswordEmail(input: {
    toEmail: string;
    nombre: string;
    resetToken: string;
  }): Promise<SendResult> {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.password) {
      console.log(
        `[email:dev] Codigo de recuperacion para ${input.toEmail} (${input.nombre}): ${input.resetToken}`,
      );
      return { sent: false, reason: "SMTP no configurado" };
    }

    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.password,
      },
    });

    await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to: input.toEmail,
      subject: "Codigo de recuperacion de contrasena",
      text: [
        `Hola ${input.nombre},`,
        "",
        `Tu codigo de recuperacion es: ${input.resetToken}`,
        "",
        "Este codigo vence en 24 horas. Si no solicitaste este cambio, ignora este mensaje.",
      ].join("\n"),
      html: `
        <p>Hola <strong>${input.nombre}</strong>,</p>
        <p>Tu codigo de recuperacion es:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${input.resetToken}</p>
        <p>Este codigo vence en 24 horas. Si no solicitaste este cambio, ignora este mensaje.</p>
      `,
    });

    return { sent: true };
  }
}
