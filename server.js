// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html, imageBase64, smtpConfig, accessToken } = req.body;
      if (!to) {
        return res.status(400).json({ error: "Falta la direcci\xF3n de correo del destinatario." });
      }
      if (smtpConfig && smtpConfig.host && smtpConfig.user) {
        const transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: Number(smtpConfig.port) || 587,
          secure: Number(smtpConfig.port) === 465,
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
          }
        });
        const mailOptions2 = {
          from: `"${smtpConfig.senderName || "Taller de Neuroimagen"}" <${smtpConfig.user}>`,
          to,
          subject,
          html
        };
        if (imageBase64) {
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
          mailOptions2.attachments = [
            {
              filename: "Pase_Taller_Neuroimagen.png",
              content: Buffer.from(base64Data, "base64"),
              cid: "ticket_qr"
            }
          ];
        }
        await transporter.sendMail(mailOptions2);
        return res.json({ success: true, method: "smtp", message: "Correo enviado v\xEDa servidor SMTP configurado." });
      }
      if (accessToken) {
        try {
          const rawMessage = createRawEmail(to, subject, html, imageBase64);
          const gmailRes = await fetch("https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "message/rfc822"
            },
            body: rawMessage
          });
          if (gmailRes.ok) {
            return res.json({ success: true, method: "gmail_api", message: "Correo enviado v\xEDa Gmail API." });
          }
        } catch (gErr) {
          console.warn("Gmail API delivery notice:", gErr);
        }
      }
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      const mailOptions = {
        from: '"Taller de Neuroimagen - Promoci\xF3n 106" <promocion106@medicina.edu>',
        to,
        subject,
        html
      };
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        mailOptions.attachments = [
          {
            filename: "Pase_Taller_Neuroimagen.png",
            content: Buffer.from(base64Data, "base64")
          }
        ];
      }
      const info = await testTransporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      return res.json({
        success: true,
        method: "test_smtp",
        previewUrl,
        message: "Correo procesado v\xEDa servidor SMTP de pruebas."
      });
    } catch (err) {
      console.error("Error sending email:", err);
      res.status(500).json({ error: err.message || "Error al enviar el correo." });
    }
  });
  app.get("/api/slides-image", async (req, res) => {
    try {
      const slideId = "1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY";
      const exportUrl = `https://docs.google.com/presentation/d/${slideId}/export/png?id=${slideId}&pageid=p`;
      const imgRes = await fetch(exportUrl);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        res.setHeader("Content-Type", "image/png");
        return res.send(Buffer.from(buffer));
      }
      res.status(404).json({ error: "Slides image not available" });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch slides image" });
    }
  });
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const port = Number(process.env.PORT) || 3e3;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}
function createRawEmail(to, subject, html, imageBase64) {
  const boundary = "----=_Part_0_123456789.987654321";
  let message = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64")
  ].join("\r\n");
  if (imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    message += [
      "",
      `--${boundary}`,
      'Content-Type: image/png; name="Pase_Taller_Neuroimagen.png"',
      "Content-Transfer-Encoding: base64",
      'Content-Disposition: attachment; filename="Pase_Taller_Neuroimagen.png"',
      "Content-ID: <ticket_qr>",
      "",
      base64Data
    ].join("\r\n");
  }
  message += `\r
--${boundary}--`;
  return message;
}
startServer();
