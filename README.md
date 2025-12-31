🎯 Donation & Charity Management Portal

A full-stack web application that connects donors with verified NGOs to manage and track donations such as food, funds, and clothes.
The platform supports donation requests, contribution tracking, pickup scheduling, and role-based access using Angular, Node.js (TypeScript), and MySQL.

📌 Project Objective

To provide a secure and user-friendly system where:

 - NGOs can publish donation requests,

 - Donors can contribute and schedule pickups,

 - Administrators can oversee platform activity (optional).

 - The project focuses on transparency, usability, and real-world workflow design.

👥 User Roles

🧑‍💼 Donor

 - Browse active donation requests

 - Contribute to donations

 - Schedule pickups for physical donations

 - View donation history

🏢 NGO

 - Create, update, and cancel donation requests

 - Manage pickup schedules

 - Approve received contributions

👑 Admin 

 - Monitor donors and NGOs

 - View donation records and analytics

 - Users select their role during registration.

🔑 Core Features

 - Donation request creation and management

 - Donation contribution and pickup scheduling

 - Donation status tracking (Pending / Confirmed / Completed)

 - Role-based access control

 - Secure authentication and authorization

 - Responsive user interface

🛠️ Technology Stack
 Frontend

 - Angular

 - HTML5, CSS3, JavaScript

 - Angular Material

 Backend

 - Node.js

 - Express.js

 - TypeScript

 Database

 - MySQL

 Tools & Libraries

 - JWT for authentication

 - bcrypt for password hashing

 - Multer for image uploads

 - Git & GitHub for version control

▶️ How to Run the Project
[1️] Clone the Repository
 - git clone https://github.com/SharmiVelayutham/Donation-Charity-Management-Portal.git

 - cd Donation-Charity-Management-Portal

[2️] Backend Setup
 - cd backend
 - npm install
 - npm run dev

Backend runs at:

http://localhost:3000

[3️] Frontend Setup
 - cd frontend
 - npm install
 - ng serve


Frontend runs at:

http://localhost:4200

🔐 Environment Configuration

Create a .env file in the backend folder:

 - PORT=3306
 - DB_HOST=localhost
 - DB_USER=root
 - DB_PASSWORD=your_password
 - DB_NAME=donation_portal
 - JWT_SECRET=your_secret_key

🧪 Validation & Error Handling

 - Mandatory field validation for donations

 - Pickup date validation (future dates only)

 - Proper HTTP status codes

 - User-friendly success and error messages

 - Graceful handling of optional features

🎓 Extra-Curricular / Value-Added Features

 - OTP-based verification for improved login security

 - Help chatbot for basic user guidance

 - Image upload support for donation requests

 - Modular backend architecture for scalability

 - Responsive design for mobile and desktop

 - Git-based collaborative development

These additions enhance usability and security while keeping the core system lightweight.

🚀 Future Enhancements

 - Online payment gateway integration

 - Email/SMS notifications

 - Advanced admin analytics dashboard

 - Mobile application support

👥 Team Collaboration

The project was developed collaboratively with shared responsibilities across:

 - Frontend development

 - Backend API development

 - Database design

 - Integration and testing

📄 License

This project is developed for academic and learning purposes.

⭐ Conclusion

The Donation & Charity Management Portal demonstrates full-stack development skills, structured architecture, and real-world application workflows, making it suitable for academic evaluation and portfolio presentation.