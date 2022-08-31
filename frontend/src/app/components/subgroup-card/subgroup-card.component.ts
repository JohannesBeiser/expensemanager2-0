import { Component, Input, OnInit } from '@angular/core';
import { GroupsService, GroupTotal, Subgroup } from 'src/app/services/groups/groups.service';

@Component({
  selector: 'app-subgroup-card',
  templateUrl: './subgroup-card.component.html',
  styleUrls: ['./subgroup-card.component.less']
})
export class SubgroupCardComponent implements OnInit {

  constructor(
    public groupsService: GroupsService
  ) { }

  @Input() subgroupTotal: GroupTotal;

  ngOnInit(): void {
  }

}
