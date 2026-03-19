-- Add telefono_whatsapp column to residentes
-- This allows each resident to register a specific WhatsApp number
-- If NULL, the regular telefono is used for WhatsApp messages
ALTER TABLE residentes ADD COLUMN IF NOT EXISTS telefono_whatsapp varchar(20);
