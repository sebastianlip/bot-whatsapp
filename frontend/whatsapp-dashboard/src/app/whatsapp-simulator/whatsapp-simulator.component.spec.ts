import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappSimulatorComponent } from './whatsapp-simulator.component';

describe('WhatsappSimulatorComponent', () => {
  let component: WhatsappSimulatorComponent;
  let fixture: ComponentFixture<WhatsappSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappSimulatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhatsappSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
