import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <Logo size={20} />
        <strong>Consultant.bf</strong>
      </div>
      <p>L'expertise qu'il vous faut, mise en relation en toute confiance.</p>
    </footer>
  );
}
