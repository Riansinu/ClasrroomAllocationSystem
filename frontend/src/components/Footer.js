import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} Classroom Allocation System &nbsp;·&nbsp; React + Node.js + MySQL
      </p>
    </footer>
  );
}
