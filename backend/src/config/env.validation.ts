import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  TELEGRAM_BOT_TOKEN!: string;

  @IsString()
  @Length(8, 128)
  TELEGRAM_WEBHOOK_SECRET!: string;

  @IsString()
  APP_BASE_URL!: string;

  @IsOptional()
  @IsString()
  SITE_URL?: string;

  @IsString()
  GEMINI_API_KEY!: string;

  @IsOptional()
  @IsString()
  GEMINI_MODEL?: string;

  @IsString()
  SUPABASE_URL!: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsOptional()
  @IsBoolean()
  TELEGRAM_SET_WEBHOOK?: boolean;

  @IsOptional()
  @IsString()
  DISCORD_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  TZ?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Variáveis de ambiente inválidas:\n${errors.toString()}`);
  }
  return validated;
}
