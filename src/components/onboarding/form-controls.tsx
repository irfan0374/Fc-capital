import type { ReactNode } from "react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { Application } from "@/lib/demo";
type FormProps = {
  name: keyof Application;
  register: UseFormRegister<Application>;
  errors: FieldErrors<Application>;
};
export function ApplicationField({
  name,
  label,
  options,
  type = "text",
  hint,
  register,
  errors,
}: FormProps & {
  label: string;
  options?: string[];
  type?: string;
  hint?: string;
}) {
  return (
    <div className="field" key={name}>
      <label htmlFor={name}>{label}</label>
      {options ? (
        <select
          id={name}
          {...register(name)}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? name + "-error" : undefined}
        >
          <option value="">Select an option</option>
          {options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          type={type}
          {...register(name)}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? name + "-error" : undefined}
          autoComplete="off"
        />
      )}
      {hint && <small>{hint}</small>}
      {errors[name] && (
        <span className="field-error" id={name + "-error"} role="alert">
          {errors[name]?.message}
        </span>
      )}
    </div>
  );
}
export function ApplicationCheckbox({
  name,
  label,
  register,
  errors,
}: FormProps & { label: ReactNode }) {
  return (
    <div className="check-wrap" key={name}>
      <label className="checkbox">
        <input
          type="checkbox"
          {...register(name)}
          aria-invalid={!!errors[name]}
        />
        <span>{label}</span>
      </label>
      {errors[name] && (
        <span className="field-error" role="alert">
          {errors[name]?.message}
        </span>
      )}
    </div>
  );
}
