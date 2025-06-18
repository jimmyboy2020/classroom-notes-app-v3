export default function Footer() {
  return (
    <footer className="bg-light py-3 mt-auto">
      <div className="container text-center">
        <p className="mb-0">&copy; {new Date().getFullYear()} Classroom Notes App. All rights reserved.</p>
      </div>
    </footer>
  );
}