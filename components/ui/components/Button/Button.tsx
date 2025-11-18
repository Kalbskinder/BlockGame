import React from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  full?: boolean;
  lang?: boolean;
  className?: string;
}

export default function Button({ children, onClick, full, lang, className }: ButtonProps) {
  const buttonClasses = [
    styles["mc-button"],
    full && styles.full,
    lang && styles.lang,
    className
  ].filter(Boolean).join(" ");

  return (
    <button className={buttonClasses} onClick={onClick}>
      <div className={styles.title}>
        {children}
      </div>
    </button>
  );
}
