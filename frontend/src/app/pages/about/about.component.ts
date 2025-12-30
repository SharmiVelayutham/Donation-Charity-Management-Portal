import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {
  pageTitle = 'About Our Charity';
  pageSubtitle = 'Empowering communities and transforming lives through compassion and action';

  mission = {
    title: 'Our Mission',
    description1: 'We are dedicated to creating lasting change in underserved communities by providing essential resources, education, and support to those who need it most.',
    description2: 'Through transparency, innovation, and collaboration, we work tirelessly to ensure every donation makes a meaningful impact in the lives of individuals and families.',
    icon: '❤️'
  };

  values = [
    {
      icon: '🤝',
      title: 'Transparency',
      description: 'We maintain complete openness in all our operations, ensuring donors know exactly how their contributions are used.'
    },
    {
      icon: '💪',
      title: 'Empowerment',
      description: 'We believe in empowering individuals and communities to build sustainable futures through education and resources.'
    },
    {
      icon: '🌟',
      title: 'Integrity',
      description: 'We uphold the highest ethical standards in everything we do, earning the trust of our donors and beneficiaries.'
    },
    {
      icon: '🌍',
      title: 'Impact',
      description: 'Every action we take is focused on creating measurable, positive change in the communities we serve.'
    }
  ];

  stats = [
    { number: '50K+', label: 'Lives Impacted' },
    { number: '200+', label: 'Active Projects' },
    { number: '15K+', label: 'Donors' },
    { number: '30+', label: 'Countries' }
  ];

  team = [
    {
      name: 'Sharmi V'
    },
    {
      name: 'Lakkireddy Indhu'
    },
    {
      name: 'Sachin Kumar'
      
    },
    
  ];

  constructor() {}

  ngOnInit() {}

  donate() {

    window.location.href = '/donations';
  }
}

