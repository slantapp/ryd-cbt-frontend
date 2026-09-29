export function isSubSchoolClassroom(classroom?: { metadata?: { rydSubCategoryId?: number | null } | null }): boolean {
  const id = classroom?.metadata?.rydSubCategoryId;
  return id !== undefined && id !== null && `${id}` !== '';
}
