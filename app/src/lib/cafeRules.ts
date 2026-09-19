// Which cafe fields the form may offer as editable. Mirrors the database rule in
// supabase/migrations/20260920000200_save_visit_cafe_edit.sql, so keep them in step:
//   * a BLANK address / map link can be filled in by anyone signed in;
//   * one that is already saved can only be changed by whoever added the cafe.
// Pure and dependency-free so it can be tested (supabase/tests/cafe_rules.test.mjs).

export type ExistingCafe = { address: string | null; map_url: string | null; created_by?: string | null } | undefined

export function cafeFieldLocks(existing: ExistingCafe, userId: string) {
  const iAddedIt = !!existing && existing.created_by === userId
  return {
    iAddedIt,
    addressLocked: !!existing && !iAddedIt && !!existing.address,
    mapLocked: !!existing && !iAddedIt && !!existing.map_url,
  }
}
