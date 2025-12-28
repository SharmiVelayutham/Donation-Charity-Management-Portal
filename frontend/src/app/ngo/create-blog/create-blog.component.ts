import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-blog.component.html',
  styleUrls: ['./create-blog.component.css']
})
export class CreateBlogComponent implements OnInit {
  blogForm = {
    title: '',
    content: '',
    category: '',
    image: null as File | null
  };

  categories = [
    'Health',
    'Education',
    'Financials',
    'Awareness',
    'Stories',
    'NGO Insights',
    'Platform Update',
    'Events',
    'Other'
  ];

  imagePreview: string | null = null;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {}

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.blogForm.image = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.blogForm.image = null;
    this.imagePreview = null;
  }

  cancel() {
    this.router.navigate(['/dashboard/ngo']);
  }

  async onSubmit() {
    if (!this.blogForm.title || !this.blogForm.content || !this.blogForm.category) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const formData = new FormData();
      formData.append('title', this.blogForm.title);
      formData.append('content', this.blogForm.content);
      formData.append('category', this.blogForm.category);
      if (this.blogForm.image) {
        formData.append('image', this.blogForm.image);
      }

      const response = await lastValueFrom(this.apiService.createBlog(formData));
      
      if (response.success) {
        this.successMessage = 'Blog created successfully!';
        setTimeout(() => {
          this.router.navigate(['/blog', response.data.id]);
        }, 1500);
      } else {
        this.errorMessage = response.message || 'Failed to create blog';
      }
    } catch (error: any) {
      console.error('Error creating blog:', error);
      this.errorMessage = error.error?.message || 'Failed to create blog. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }
}

