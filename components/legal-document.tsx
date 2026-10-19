import {
  legalOperator,
  legalRevision,
  type LegalDocumentId,
} from "@/lib/legal";
function Operator() {
  return (
    <section>
      <h2>Responsables y contacto</h2>
      <p>{legalOperator.names} son los responsables de Fairway.</p>
      {legalOperator.address && (
        <p>Domicilio de contacto: {legalOperator.address}</p>
      )}
      {legalOperator.email && (
        <p>
          Privacidad y solicitudes:{" "}
          <a href={`mailto:${legalOperator.email}`}>{legalOperator.email}</a>
        </p>
      )}
      {(!legalOperator.address || !legalOperator.email) && (
        <p className="legal-pending" role="note">
          Aviso pendiente de completar: faltan datos de contacto del
          responsable. Esta información sobre el producto no sustituye un aviso
          integral completo.
        </p>
      )}
    </section>
  );
}
export function LegalDocument({ document }: { document: LegalDocumentId }) {
  return (
    <div className="legal-copy">
      <p className="legal-date">Actualizado: {legalRevision}</p>
      {document === "privacidad" && (
        <>
          <Operator />
          <section>
            <h2>Qué datos utilizamos y para qué</h2>
            <p>
              Fairway conecta golfistas adultos y permite organizar partidas.
              Utilizamos tu correo y credenciales de acceso para autenticarte;
              tu nombre de perfil, edad, ciudad, club declarado, handicap,
              disponibilidad y preferencias para mostrar tu perfil y encontrar
              compañeros. La biografía, las fotos y la información que publiques
              son opcionales.
            </p>
            <p>
              También se procesan las partidas, solicitudes, mensajes, scores,
              evaluaciones y reportes que creas para ofrecer esas funciones y
              atender problemas en la comunidad. No necesitas proporcionar un
              domicilio, teléfono o fecha de nacimiento completa. Evita incluir
              datos sensibles en tu biografía, imágenes o mensajes.
            </p>
          </section>
          <section>
            <h2>Quién puede ver tu información</h2>
            <p>
              Tu correo no se publica en el perfil. Puedes configurar la
              visibilidad de tu perfil en Ajustes y la de tus publicaciones al
              crearlas. La información que compartas con otros miembros podrá
              ser leída por esos destinatarios. Revisa esas opciones antes de
              publicar.
            </p>
            <p>
              Supabase proporciona autenticación, base de datos y
              almacenamiento. Si eliges entrar con Google, Google comparte los
              datos autorizados para autenticarte. Estos proveedores procesan
              información según sus servicios y políticas:{" "}
              <a href="https://supabase.com/privacy">Supabase</a> y{" "}
              <a href="https://policies.google.com/privacy">Google</a>. Los
              servicios de alojamiento reciben datos técnicos, como la dirección
              IP, al atender una conexión.
            </p>
          </section>
          <section>
            <h2>Ubicación opcional</h2>
            <p>
              Al completar un perfil nuevo se solicita permiso del navegador una
              vez en este navegador y cuenta. También puedes pulsar «Usar mi
              ubicación». Si aceptas, el navegador obtiene una ubicación puntual
              y envía coordenadas redondeadas a dos decimales a BigDataCloud
              para identificar la ciudad. Ese proveedor también recibe la
              dirección IP de la conexión. No envíes tu ubicación si no deseas
              ese procesamiento: puedes rechazar el permiso y elegir la ciudad
              manualmente.
            </p>
            <p>
              Fairway guarda la ciudad cuando envías el formulario, no las
              coordenadas. No hace seguimiento continuo ni utiliza la IP como
              alternativa cuando rechazas el permiso. Consulta{" "}
              <a href="https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free">
                cómo funciona el servicio de BigDataCloud
              </a>
              .
            </p>
          </section>
          <section>
            <h2>Acceso, cambios y eliminación</h2>
            <p>
              Puedes editar tu perfil, cambiar su visibilidad, bloquear
              miembros, cerrar sesión y solicitar eliminar tu cuenta desde
              Ajustes. El borrado requiere verificar tu identidad. Para
              solicitudes de acceso, rectificación, cancelación u oposición
              (ARCO), revocación o limitación del uso de datos, debe utilizarse
              el correo de privacidad indicado en este aviso.
            </p>
            <p>
              Los datos de la cuenta se utilizan mientras se prestan sus
              funciones. El responsable debe completar los plazos de
              conservación y las excepciones aplicables, incluidas las copias de
              respaldo de proveedores. No se promete un borrado inmediato de
              todos los respaldos.
            </p>
          </section>
          <section>
            <h2>Cambios en esta información</h2>
            <p>
              Las actualizaciones se publicarán en esta misma dirección con una
              fecha de revisión. Fairway está destinado a mayores de 18 años.
              Consulta también la{" "}
              <a href="/legal/cookies/">
                información de almacenamiento del navegador
              </a>
              .
            </p>
          </section>
        </>
      )}
      {document === "terminos" && (
        <>
          <section>
            <h2>Tu cuenta y la comunidad</h2>
            <p>
              Fairway está dirigido a mayores de 18 años. Usa información veraz,
              protege tu acceso y trata a los demás con respeto. No publiques
              suplantaciones, amenazas, acoso, datos personales de terceros sin
              autorización ni contenido que infrinja derechos.
            </p>
            <p>
              Publica solamente imágenes y contenido propios o que tengas
              permiso de compartir. Las evaluaciones deben describir tu
              experiencia real; la función exige una partida compartida y
              finalizada registrada en Fairway. Esa comprobación no acredita por
              GPS que las personas hayan asistido.
            </p>
          </section>
          <section>
            <h2>Partidas, clubes y perfiles</h2>
            <p>
              Los horarios y condiciones de una partida se acuerdan entre
              participantes. Confirma directamente con el club el acceso, las
              tarifas y las reglas. Fairway no garantiza una reservación ni una
              membresía por crear una partida.
            </p>
            <p>
              El handicap y la membresía son datos declarados por cada usuario.
              El directorio indica cuándo los datos de un club están pendientes
              de confirmar. Las fotografías marcadas como ilustrativas no
              representan ese club. Su inclusión no implica una afiliación
              oficial.
            </p>
          </section>
          <section>
            <h2>Controles y reportes</h2>
            <p>
              Puedes bloquear usuarios, reportar contenido y solicitar eliminar
              tu cuenta desde Ajustes. Los reportes permiten revisar posibles
              incumplimientos; evita acusaciones falsas y no compartas
              contraseñas ni datos bancarios en el chat.
            </p>
          </section>
          <section>
            <h2>Costo y cambios</h2>
            <p>
              Fairway no integra actualmente cobros ni suscripciones. Cualquier
              incorporación de funciones de pago deberá informar sus precios y
              condiciones antes de contratar. Consulta{" "}
              <a href="/legal/pagos/">pagos y reembolsos</a>. Estas condiciones
              no eliminan derechos que te otorgue la legislación aplicable.
            </p>
          </section>
          <Operator />
        </>
      )}
      {document === "cookies" && (
        <>
          <section>
            <h2>Qué guarda el navegador</h2>
            <p>
              La aplicación utiliza almacenamiento local para mantener tu sesión
              con Supabase, recordar el modo de accesibilidad y evitar repetir
              automáticamente la pregunta de ubicación de un perfil nuevo. Este
              último registro solo indica que se intentó preguntar; no contiene
              coordenadas.
            </p>
            <ul>
              <li>
                Sesión de Supabase: claves del proveedor para conservar el
                acceso y completar la autenticación.
              </li>
              <li>
                Preferencia de accesibilidad: se conserva hasta que la cambies o
                borres el almacenamiento del sitio.
              </li>
              <li>
                Pregunta de ubicación: marca local por cuenta para no repetir el
                aviso automáticamente.
              </li>
            </ul>
          </section>
          <section>
            <h2>Analítica y servicios externos</h2>
            <p>
              El código actual de Fairway no incorpora analítica publicitaria,
              píxeles de seguimiento ni contenido incrustado de redes sociales.
              Las fotografías de diseño y las fuentes se sirven desde el sitio.
              El inicio con Google y la detección de ciudad utilizan proveedores
              externos cuando eliges esas funciones.
            </p>
            <p>
              Esto no describe ni controla todos los registros técnicos de los
              proveedores de alojamiento y autenticación. Puedes consultar sus
              políticas desde la{" "}
              <a href="/legal/privacidad/">información de privacidad</a>. Si se
              incorpora seguimiento opcional, habrá que informar su finalidad y
              establecer las opciones correspondientes antes de activarlo.
            </p>
          </section>
          <section>
            <h2>Cómo cambiarlo</h2>
            <p>
              Puedes cerrar sesión en Ajustes, cambiar el modo de accesibilidad
              y eliminar los datos de este sitio desde la configuración del
              navegador. Borrarlos puede cerrar tu sesión y restablecer tus
              preferencias, pero no elimina tu cuenta. El permiso de ubicación
              se administra por separado en el navegador.
            </p>
          </section>
        </>
      )}
      {document === "pagos" && (
        <>
          <section>
            <h2>Fairway no cobra actualmente</h2>
            <p>
              La versión actual no tiene pasarela de pago, suscripciones ni
              cobros por usar la plataforma. No hay pagos cobrados por Fairway
              que reembolsar.
            </p>
          </section>
          <section>
            <h2>Acuerdos con clubes o instructores</h2>
            <p>
              Las tarifas de campo, clases, alimentos y otros servicios
              acordados directamente con terceros dependen de ese proveedor.
              Confirma el precio, la disponibilidad y las condiciones de
              cancelación y reembolso con él antes de pagar. Una publicación o
              partida en Fairway no equivale a comprar esos servicios.
            </p>
          </section>
          <section>
            <h2>Si incorporamos cobros</h2>
            <p>
              Antes de habilitarlos se deberán publicar los precios, identidad y
              contacto del proveedor, condiciones de contratación, cancelación y
              procedimiento de reembolso. Esta página no restringe los derechos
              que correspondan por ley.
            </p>
          </section>
        </>
      )}
      {document === "creditos" && (
        <>
          <section>
            <h2>Fotografía</h2>
            <p>
              La fotografía aérea utilizada en el diseño es de{" "}
              <a href="https://unsplash.com/photos/aerial-view-of-a-beautiful-golf-course-4WSLeNydrlo">
                Keith Tanner en Unsplash
              </a>
              , publicada bajo la{" "}
              <a href="https://unsplash.com/license">licencia de Unsplash</a>.
              Las fotos del directorio son ilustrativas y no identifican las
              instalaciones de cada club.
            </p>
            <p>
              Las imágenes subidas por miembros son contenido de sus autores.
              Cada persona debe tener permiso para compartirlas. Puedes reportar
              contenido desde la aplicación.
            </p>
          </section>
          <section>
            <h2>Tipografía, iconos e ilustraciones</h2>
            <p>
              Inter se distribuye bajo la{" "}
              <a href="/licenses/Inter-OFL.txt">SIL Open Font License</a>. Los
              iconos Lucide se distribuyen bajo su{" "}
              <a href="/licenses/Lucide-LICENSE.txt">licencia ISC</a>. Las
              ilustraciones de campo, avatar y textura del sitio se realizan con
              SVG.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
