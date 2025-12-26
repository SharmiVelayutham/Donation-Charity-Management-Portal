import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent {

  blogs = [
    {
      title: 'How Small Donations Create Big Impact',
      category: 'Awareness',
      date: 'January 2025',
      summary: 'Even a small donation can bring meaningful change when combined with others.',
      content: 'Small contributions collectively help provide food, education, and healthcare to families in need. Our platform ensures every donation reaches verified NGOs, making each contribution impactful.'
    },
    {
      title: 'Why Verified NGOs Matter',
      category: 'NGO Insights',
      date: 'January 2025',
      summary: 'Transparency and trust are essential for effective charitable work.',
      content: 'Verified NGOs ensure donations are used ethically and responsibly. Our platform partners only with audited NGOs to maintain donor confidence and transparency.'
    },
    {
      title: 'A Day in the Life of a Volunteer',
      category: 'Stories',
      date: 'February 2025',
      summary: 'Volunteers are the backbone of social change initiatives.',
      content: 'From distributing food to supporting education drives, volunteers work closely with NGOs to deliver help directly to communities in need.'
    },
    {
      title: 'How Our Platform Ensures Secure Donations',
      category: 'Platform Update',
      date: 'February 2025',
      summary: 'Security and transparency are built into our donation system.',
      content: 'We use role-based access, secure handling of requests, and verified NGOs to ensure donations are processed safely and responsibly.'
    }
  ];

  expandedIndex: number | null = null;

  toggleReadMore(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }
}
