import styles from "./Input.module.css";

interface InputProps {
    className?: string;
    placeholder?: string;
    value?: string;
    minLength?: number;
    maxLength?: number;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Input({  
    className, 
    placeholder = "", 
    value, 
    minLength, 
    maxLength,
    disabled = false,
    onChange
}: InputProps) {
    const inputClasses = [styles["mc-input"], className]
        .filter(Boolean)
        .join(" ");

    return <input
        onChange={onChange}
        className={inputClasses} 
        placeholder={placeholder} 
        value={value} 
        minLength={minLength} 
        maxLength={maxLength} 
        disabled={disabled}
    />;
}
