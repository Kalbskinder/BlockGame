import styles from './Slider.module.css';

interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    valueName?: string;
    formatValue?: (value: number) => string;
    onChange?: (value: number) => void;
}

export default function Slider({
    min = 1,
    max = 100,
    step = 1,
    value,
    valueName,
    formatValue,
    onChange,
}: SliderProps) {
    const displayValue = value ?? min;
    const labelText = valueName
        ? `${valueName}: ${formatValue ? formatValue(displayValue) : displayValue}`
        : `${formatValue ? formatValue(displayValue) : displayValue}`;

    return (
        <div className={styles.panel}>
            <span className={styles.label}>{labelText}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={displayValue}
                className={styles.sliderInput}
                onChange={(e) => onChange?.(Number(e.target.value))}
            />
        </div>
    );
}