import nodemailer, { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

export interface BrandVars {
  marca: string;
  color: string;
  logoUrl?: string | null;
}

export interface SendMailInput {
  id_cola: number;
  to: string;
  subject: string;
  plantilla: string;
  vars: Record<string, unknown>;
  brand: BrandVars;
}

const TEMPLATES_DIR = path.join(__dirname, '..', 'mail', 'templates');
const compiledCache = new Map<string, HandlebarsTemplateDelegate>();

function compileTemplate(name: string): HandlebarsTemplateDelegate {
  const cached = compiledCache.get(name);
  if (cached) return cached;
  const raw = fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.hbs`), 'utf-8');
  const compiled = Handlebars.compile(raw);
  compiledCache.set(name, compiled);
  return compiled;
}

export function renderMail(plantilla: string, vars: Record<string, unknown>, brand: BrandVars): string {
  const body = compileTemplate(plantilla)({ ...vars, ...brand });
  return compileTemplate('layout')({ ...vars, ...brand, body });
}

let transporter: Transporter | null = null;

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail(input: SendMailInput): Promise<{ enviado: boolean; error?: string }> {
  const html = renderMail(input.plantilla, input.vars, input.brand);
  if (!smtpConfigured()) {
    await prisma.emailLog
      .create({
        data: {
          id_cola: input.id_cola,
          destinatario: input.to,
          plantilla: input.plantilla,
          asunto: input.subject,
          estado: 'OMITIDO',
          error: 'SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)',
        },
      })
      .catch((e) => logger.warn('No se pudo auditar email:', e));
    logger.info(`[mail:omitido] ${input.plantilla} → ${input.to} (sin SMTP)`);
    return { enviado: false, error: 'SMTP no configurado' };
  }
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      html,
    });
    logger.info(`[mail:enviado] ${input.plantilla} → ${input.to} messageId=${(info as any)?.messageId ?? '?'}`);
    await prisma.emailLog
      .create({
        data: {
          id_cola: input.id_cola,
          destinatario: input.to,
          plantilla: input.plantilla,
          asunto: input.subject,
          estado: 'ENVIADO',
        },
      })
      .catch((e) => logger.warn('No se pudo auditar email:', e));
    return { enviado: true };
  } catch (e: any) {
    const msg = e?.message || 'Error SMTP desconocido';
    logger.warn(`[mail:fallo] ${input.plantilla} → ${input.to}: ${msg}`);
    await prisma.emailLog
      .create({
        data: {
          id_cola: input.id_cola,
          destinatario: input.to,
          plantilla: input.plantilla,
          asunto: input.subject,
          estado: 'FALLO',
          error: msg,
        },
      })
      .catch(() => null);
    return { enviado: false, error: msg };
  }
}
