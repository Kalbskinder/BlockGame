import styles from "./Modal.module.css";

interface ModalProps {
    children?: React.ReactNode;
    hidden?: boolean;
    onClose?: () => void;
}

export default function Modal({ children, hidden, onClose }: ModalProps) {
    if (hidden) {
        return null;
    }

    const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };
    
    return (
        <div className={styles["bg-modal"]} onClick={handleBackgroundClick}>
            <div className={styles["modal-content"]}>{children}</div>
        </div>
    );
}