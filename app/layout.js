import './globals.css';
import '@/lib/scheduler-init'; // Import to ensure scheduler is initialized

export const metadata = {
  title: 'Attendance-Based Meal System',
  description: 'This project integrates a free meal monitoring system with a security attendance system to automate meal eligibility verification using secure attendance records, ensuring accuracy, transparency, and efficient meal distribution.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body 
        className="min-h-screen bg-gray-100" 
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}