import { Navbar, Nav, Container } from 'react-bootstrap';

export default function AppNavbar() {
  return (
    <Navbar expand="lg" bg="dark" data-bs-theme="dark">
      <Container fluid>
        <Navbar.Brand href="/">Proyecto Electro</Navbar.Brand>

        {/* react-bootstrap maneja el collapse internamente, ya no
            necesitamos data-bs-toggle ni data-bs-target manuales */}
        <Navbar.Toggle aria-controls="navbar-main" />

        <Navbar.Collapse id="navbar-main">
          <Nav className="ms-auto">
            <Nav.Link href="/equipos">Equipos</Nav.Link>
            <Nav.Link href="/camiones">Camiones</Nav.Link>
            <Nav.Link href="/finanzas">Finanzas</Nav.Link>
            <Nav.Link href="/operaciones">Operaciones</Nav.Link>
            <Nav.Link href="/administracion">Administración</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
