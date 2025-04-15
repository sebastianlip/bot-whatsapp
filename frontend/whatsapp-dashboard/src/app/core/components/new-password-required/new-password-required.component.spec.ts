import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewPasswordRequiredComponent } from './new-password-required.component';

describe('NewPasswordRequiredComponent', () => {
  let component: NewPasswordRequiredComponent;
  let fixture: ComponentFixture<NewPasswordRequiredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPasswordRequiredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewPasswordRequiredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
