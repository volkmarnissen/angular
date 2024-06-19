import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api-service';
import { SessionStorage } from '../services/SessionStorage';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  hide: boolean = true;
  isRegisterMode = false;
  form: FormGroup;
  sub: Subscription;
  toUrl: string | number;
  constructor(private _formBuilder: FormBuilder, private api: ApiService, private router: Router, private route: ActivatedRoute) {
  }
  ngAfterViewInit(): void {
    let posRegister = this.router.url.indexOf("register")
    // If the url part of the URL and not the parameter contains register, we are in register mode
    this.isRegisterMode = (posRegister >= 0)
    this.sub = this.route.paramMap.subscribe(params => {
      this.toUrl = params.get('toUrl') || '';
    })
  }

  ngOnInit(): void {
    this.form = this._formBuilder.group({
      username: ["", Validators.required],
      password: ["", Validators.required],
    });
  }
  private login(username: string, password: string) {
    this.api.getUserLogin(username, password).subscribe(token => {
      new SessionStorage().setAuthToken(token)
      var u = new URLSearchParams(new URL(this.router.url).search )
      var toUrl = u.get("toUrl")
      if( u && toUrl)
        this.toUrl = toUrl
      else
        this.toUrl =""
      this.router.navigate([this.toUrl], { queryParams: { tokenWasExpired: true } })
    })
  }
  onSubmit() {
    let username = this.form.get("username")!.value
    let password = this.form.get("password")!.value
    if (this.isRegisterMode) {
      this.api.getUserRegister(username, password).subscribe(() => {
        this.login(username, password)
      })
    } else
      this.login(username, password)
  }

}
