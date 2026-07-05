export function validateName(name) {
  if (!name || !name.trim()) return '请输入姓名';
  if (name.length > 10) return '姓名不能超过10个字符';
  return null;
}

export function validateStudentId(id) {
  if (!id || !id.trim()) return '请输入学号';
  if (!/^\d+$/.test(id)) return '学号只能包含数字';
  if (id.length > 15) return '学号不能超过15位';
  return null;
}
