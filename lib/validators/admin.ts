import { z } from "zod";

export const adminEntityIdSchema = z.string().uuid();
