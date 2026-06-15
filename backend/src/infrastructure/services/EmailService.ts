export class EmailService {
  async sendResetPasswordEmail(input: {
    toEmail: string;
    nombre: string;
    resetToken: string;
  }): Promise<void> {
    console.log(
      `[email] Reset password para ${input.toEmail} (${input.nombre}). Token: ${input.resetToken}`,
    );
  }
}
