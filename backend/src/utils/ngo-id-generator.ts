
import { queryOne } from '../config/mysql';
export async function generateNgoId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `NGO-${currentYear}-`;
  const prefixLength = prefix.length;
  const result = await queryOne<{ max_seq: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(ngo_id, ?) AS UNSIGNED)), 0) as max_seq
     FROM users 
     WHERE ngo_id IS NOT NULL 
       AND ngo_id LIKE ? 
       AND role = 'NGO'
       AND LENGTH(ngo_id) >= ?`,
    [prefixLength + 1, `${prefix}%`, prefixLength + 4]
  );
  
  const nextSeq = (result?.max_seq || 0) + 1;
  const ngoId = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  
  console.log(`[NGO ID Generator] Generated NGO ID: ${ngoId} (Sequence: ${nextSeq})`);
  return ngoId;
}
export function isValidNgoId(ngoId: string): boolean {
  const pattern = /^NGO-\d{4}-\d{4}$/;
  return pattern.test(ngoId);
}

