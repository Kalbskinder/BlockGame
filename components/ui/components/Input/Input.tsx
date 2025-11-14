import styles from "./Input.module.css";

interface InputProps {
    className?: string;
    placeholder?: string;
    value?: string;
    minLength?: number;
    maxLength?: number;
}

export default function Input({ className, placeholder, value, minLength, maxLength }: InputProps) {
    const inputClasses = [styles["mc-input"], className]
        .filter(Boolean)
        .join(" ");

    return <input className={inputClasses} placeholder={placeholder} value={value} minLength={minLength} maxLength={maxLength} />;
}
