import gateImg from './cctv_entrance_gate_1790763519317.jpg';
import lobbyImg from './cctv_lobby_view_1790763531511.jpg';
import garageImg from './cctv_garage_view_1791111418063.jpg';
import elevatorImg from './cctv_elevator_hall_1791111431685.jpg';
import perimeterImg from './cctv_perimeter_wall_1791111446334.jpg';
import facadeImg from './condo_facade_photo_1790763360839.jpg';
import crestImg from './condo_logo_crest_1790763372283.jpg';
import logoBadgeImg from './cast360_logo_badge_1790935176499.jpg';

export const ASSET_IMAGES = {
  entranceGate: gateImg,
  lobby: lobbyImg,
  garage: garageImg,
  elevatorHall: elevatorImg,
  perimeterWall: perimeterImg,
  facade: facadeImg,
  condoCrest: crestImg,
  logoBadge: logoBadgeImg,
};

export function getZoneDefaultImage(zone?: string): string {
  switch (zone) {
    case 'portao_veicular':
      return gateImg;
    case 'portao_social':
      return lobbyImg;
    case 'garagem_subsolo':
      return garageImg;
    case 'hall_torre_a':
    case 'hall_torre_b':
      return elevatorImg;
    case 'perimetro':
    case 'area_lazer':
    default:
      return perimeterImg;
  }
}
