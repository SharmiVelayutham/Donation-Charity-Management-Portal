import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-blog.component.html',
  styleUrls: ['./edit-blog.component.css']
})
export class EditBlogComponent implements OnInit {
  blogId: number = 0;
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
  existingImageUrl: string | null = null;
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(async params => {
      this.blogId = parseInt(params['id']);
      await this.loadBlog();
    });
  }

  async loadBlog() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.apiService.getBlogById(this.blogId));
      if (response.success && response.data) {
        const blog = response.data.blog;
        const user = this.authService.getUser();
        if (!user || parseInt(user.id) !== blog.author_ngo_id) {
          alert('You do not have permission to edit this blog');
          this.router.navigate(['/blog', this.blogId]);
          return;
        }
        this.blogForm.title = blog.title;
        this.blogForm.content = blog.content;
        this.blogForm.category = blog.category;
        this.existingImageUrl = blog.image_url;
        if (blog.image_url) {
          const baseUrl = environment.apiUrl.replace('/api', '');
          this.imagePreview = `${baseUrl}${blog.image_url}`;
        }
      } else {
        this.router.navigate(['/blog']);
      }
    } catch (error) {
      console.error('Error loading blog:', error);
      this.router.navigate(['/blog']);
    } finally {
      this.isLoading = false;
    }
  }

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
    this.imagePreview = this.existingImageUrl 
      ? `${environment.apiUrl.replace('/api', '')}${this.existingImageUrl}` 
      : null;
  }

  cancel() {
    this.router.navigate(['/blog', this.blogId]);
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

      const response = await lastValueFrom(this.apiService.updateBlog(this.blogId, formData));
      
      if (response.success) {
        this.successMessage = 'Blog updated successfully!';
        setTimeout(() => {
          this.router.navigate(['/blog', this.blogId]);
        }, 1500);
      } else {
        this.errorMessage = response.message || 'Failed to update blog';
      }
    } catch (error: any) {
      console.error('Error updating blog:', error);
      this.errorMessage = error.error?.message || 'Failed to update blog. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }
}

