const departments = [
  "CSE",
  "EEE",
  "English",
  "Economics",
  "LAW",
  "Business Administration",
  "Civil Engineering",
  "Architecture",
  "Mathematics",
  "Sociology",
  "Other",
];
export default function DepartmentSelect({ value = "", admin = false }) {
  const options = [...departments, ...(admin ? ["Campus administration"] : [])];
  if (value && !options.includes(value)) options.unshift(value);
  return (
    <select name="department" required defaultValue={value}>
      <option value="" disabled>
        Select your department
      </option>
      {options.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
