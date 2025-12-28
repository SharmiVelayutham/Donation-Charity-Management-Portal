import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
  blogs: any[] = [];
  categoryCounts: any[] = [];
  searchQuery: string = '';
  selectedCategory: string = '';
  isLoading: boolean = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      if (params['category']) {
        this.selectedCategory = params['category'];
      } else {
        this.selectedCategory = '';
      }
      if (params['search']) {
        this.searchQuery = params['search'];
      } else {
        this.searchQuery = '';
      }
      await this.loadBlogs();
    });
    if (!this.route.snapshot.queryParams['category'] && !this.route.snapshot.queryParams['search']) {
      await this.loadBlogs();
    }
  }

  async loadBlogs() {
    this.isLoading = true;
    try {
      const params: any = {};
      if (this.selectedCategory) params.category = this.selectedCategory;
      if (this.searchQuery) params.search = this.searchQuery;

      const response = await lastValueFrom(this.apiService.getBlogs(params));
      console.log('=== BLOG LOADING DEBUG ===');
      console.log('Request params:', params);
      console.log('Full API Response:', JSON.stringify(response, null, 2));
      console.log('Response success:', response.success);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Is data array?', Array.isArray(response.data));
      
      if (response.success) {
        if (response.data) {
          if (response.data.blogs !== undefined) {
            this.blogs = Array.isArray(response.data.blogs) ? response.data.blogs : [];
            this.categoryCounts = Array.isArray(response.data.categoryCounts) ? response.data.categoryCounts : [];
            console.log('✅ Found blogs array:', this.blogs.length);
            console.log('✅ Found categoryCounts:', this.categoryCounts.length);
          } 
          else if (Array.isArray(response.data)) {
            this.blogs = response.data;
            this.categoryCounts = [];
            console.log('✅ Data is direct array:', this.blogs.length);
          }
          else {
            console.warn('⚠️ Unexpected response data structure:', response.data);
            console.warn('Data keys:', Object.keys(response.data || {}));
            this.blogs = [];
            this.categoryCounts = [];
          }
        } else {
          console.warn('⚠️ No data in response');
          this.blogs = [];
          this.categoryCounts = [];
        }
        console.log('Final blogs count:', this.blogs.length);
        if (this.blogs.length > 0) {
          console.log('First blog:', this.blogs[0]);
        }
        console.log('Final categoryCounts:', this.categoryCounts.length);
      } else {
        console.error('❌ Response not successful:', response);
        this.blogs = [];
        this.categoryCounts = [];
      }
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Error loading blogs:', error);
      this.blogs = [];
      this.categoryCounts = [];
    } finally {
      this.isLoading = false;
    }
  }

  onSearch() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        search: this.searchQuery || null,
        category: this.selectedCategory || null
      },
      queryParamsHandling: 'merge'
    });
  }

  onCategorySelect(category: string) {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        category: this.selectedCategory || null,
        search: this.searchQuery || null
      },
      queryParamsHandling: 'merge'
    });
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
    const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${cleanUrl}`;
  }

  onImageError(event: any) {
    console.error('Image failed to load:', event.target.src);
    event.target.style.display = 'none';
  }

  getPlainText(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  }

  navigateToBlog(blogId: number) {
    this.router.navigate(['/blog', blogId]);
  }
}
