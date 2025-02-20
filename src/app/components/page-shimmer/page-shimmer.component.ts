import { Component,Input,OnInit } from '@angular/core';

@Component({
  selector: 'app-page-shimmer',
  templateUrl: './page-shimmer.component.html',
  styleUrls: ['./page-shimmer.component.css']
})
export class PageShimmerComponent implements OnInit {
  @Input() isLoading: boolean = true; 

  ngOnInit(): void {
    
  }
}