import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css']
})
export class BlogDetailComponent implements OnInit {
  blog: any = null;
  relatedBlogs: any[] = [];
  isLoading: boolean = false;
  blogId: number = 0;
  safeContent: SafeHtml = '';
  isAuthor: boolean = false;
  currentUserId: number | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
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
        this.blog = response.data.blog;
        this.relatedBlogs = response.data.relatedBlogs || [];
        this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.blog.content || '');
        const user = this.authService.getUser();
        if (user && user.id) {
          this.currentUserId = parseInt(user.id);
          this.isAuthor = this.currentUserId === this.blog.author_ngo_id;
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

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getImageUrl(imageUrl: string | null): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  shareOnEmail() {
    const subject = encodeURIComponent(this.blog.title);
    const body = encodeURIComponent(`Check out this blog: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  shareOnWhatsApp() {
    const text = encodeURIComponent(`Check out this blog: ${this.blog.title} - ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!');
    });
  }

  navigateToBlog(blogId: number) {
    this.router.navigate(['/blog', blogId]);
  }

  editBlog() {
    this.router.navigate(['/ngo/edit-blog', this.blogId]);
  }

  async deleteBlog() {
    if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await lastValueFrom(this.apiService.deleteBlog(this.blogId));
      if (response.success) {
        alert('Blog deleted successfully');
        this.router.navigate(['/blog']);
      } else {
        alert(response.message || 'Failed to delete blog');
      }
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      alert(error.error?.message || 'Failed to delete blog');
    }
  }
}

