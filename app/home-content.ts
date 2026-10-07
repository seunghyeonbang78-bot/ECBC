export const homeHtml = `
<section class="hero">
  <div class="hero-copy">
    <div class="eyebrow">
      <span class="line"></span>
      MARYLAND’S BADMINTON COMMUNITY
    </div>

    <h1>
      A place to play.<br>
      A reason to<br>
      <em>keep coming back.</em>
    </h1>

    <p>
      Find your next rally, sharpen your game, and share the court.
      Welcome to East Coast Badminton Club.
    </p>

    <div class="actions">
      <a class="button lime" href="#play">Find court time</a>
      <a class="text-link" href="/training">Explore training</a>
    </div>

    <div class="hero-bottom">
      <span>OPEN GYM &nbsp; / &nbsp; GROUP TRAINING &nbsp; / &nbsp; PRIVATE LESSONS</span>
      <span>01 — THE CLUB</span>
    </div>
  </div>

  <div class="hero-photo">
    <img
      src="/assets/court.jpg"
      alt="Badminton players at an East Coast Badminton Club tournament"
      fetchpriority="high"
    >
    <div class="photo-label">
      <span>THE COURT IS CALLING.</span>
      <small>East Coast Badminton Club · Maryland</small>
    </div>
    <span class="photo-tag">MORE THAN A GAME.</span>
  </div>
</section>

<div class="ribbon">
  <span>GOOD GAMES.</span>
  <span class="asterisk">✳</span>
  <span>GREAT PEOPLE.</span>
  <span class="asterisk">✳</span>
  <span>ONE COMMUNITY.</span>
  <span class="asterisk">✳</span>
  <span>SEE YOU ON COURT.</span>
</div>

<section id="programs" class="section programs">
  <div class="section-heading">
    <div>
      <span class="eyebrow">01 / FIND YOUR FIT</span>
      <h2>Your game.<br>Your way.</h2>
    </div>
    <p>
      A casual rally or a more focused session.<br>
      Make room for the way you want to play.
    </p>
  </div>

  <div class="program-grid">
    <article class="program">
      <span class="number">01</span>
      <div class="program-title">
        <span class="pill">PLAY</span>
        <h3>Open gym</h3>
      </div>
      <p>
        Bring your racket and get on court.
        Check the club calendar for locations and session times.
      </p>
      <a class="underlined" href="#play">Explore open gym</a>
    </article>

    <article class="program featured">
      <span class="number">02</span>
      <div class="program-title">
        <span class="pill">LEARN TOGETHER</span>
        <h3>Group training</h3>
      </div>
      <p>
        Build your badminton game in a group setting.
        Ask about current junior and adult training options.
      </p>
      <a class="underlined" href="/training">View training programs</a>
    </article>

    <article class="program">
      <span class="number">03</span>
      <div class="program-title">
        <span class="pill">FOCUS ON YOU</span>
        <h3>Private coaching</h3>
      </div>
      <p>
        Private lessons are available by arrangement.
        Call Coach Yeping at (202) 390-8988 to choose a lesson time.
      </p>
      <a class="underlined" href="#contact">Arrange a lesson</a>
    </article>
  </div>
</section>

<section id="play" class="play section">
  <div>
    <span class="eyebrow">02 / MEET US ON COURT</span>
    <h2>Less scrolling.<br>More playing.</h2>
    <p>
      Find your next session on our club calendar.
      Times and locations can change, so check before you head out.
    </p>
    <a class="button dark" href="/calendar">View club calendar</a>
  </div>

  <div class="visit">
    <div class="visit-top">
      <h3>Plan your visit</h3>
      <span>OPEN GYM</span>
    </div>
    <p class="visit-message">
      Session times, locations, and cancellations are posted in our calendar.
    </p>
    <a class="button dark" href="/calendar">See upcoming sessions</a>
    <p class="fineprint">
      For current drop-in fees and membership options, contact the club.
    </p>
    <div class="visit-footer">
      <span>Questions about a session?</span>
      <a href="tel:+12023908988">(202) 390-8988</a>
    </div>
    <a class="underlined membership" href="/#contact">
      View membership information
    </a>
  </div>
</section>

<section class="coach section" id="coach">
  <div class="coach-image">
    <img
      src="/assets/coach.jpg"
      alt="ECBC founder and coach Yeping Tang"
      loading="lazy"
    >
    <span>EXPERIENCE. SHARED.</span>
  </div>

  <div class="coach-copy">
    <span class="eyebrow">03 / LEARN FROM EXPERIENCE</span>
    <h2>A champion’s game.<br>A coach’s mindset.</h2>
    <h3>Yeping Tang</h3>
    <span class="coach-role">ECBC FOUNDER & COACH</span>
    <p>
      Learn with a coach whose playing career includes national titles
      and international competition.
    </p>

    <div class="achievements">
      <div>
        <strong>1999</strong>
        <span>Pan American Games<br>Singles gold</span>
      </div>
      <div>
        <strong>1999</strong>
        <span>U.S. Open<br>Singles champion</span>
      </div>
    </div>

    <a class="underlined" href="/coach">Read Coach Yeping’s story</a>
  </div>
</section>

<section class="club section" id="club">
  <span class="eyebrow">04 / THE PEOPLE BEHIND THE RALLIES</span>

  <div class="club-content">
    <h2>
      Different players.<br>
      Same love of<br>
      <em>the game.</em>
    </h2>

    <div>
      <p>
        East Coast Badminton Club brings badminton training, open gym,
        and a shared love of the sport to Maryland.
      </p>
      <p>
        Explore moments from the club’s tournament history,
        or catch up on announcements before your next visit.
      </p>
      <div class="club-links">
        <a href="/history">Photos & tournament archives</a>
        <a href="/news">Club news & updates</a>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="contact section">
  <div>
    <span class="eyebrow">YOUR NEXT RALLY STARTS HERE</span>
    <h2>Let’s get<br>you on court.</h2>
    <p>
      Questions about training, open gym, or membership?<br>
      Get in touch with the club.
    </p>
  </div>

  <div class="contact-panel">
    <h3>Find your place on court.</h3>
    <p>
      Talk to Coach Yeping about lessons, membership, or your first visit.
    </p>
    <a class="button lime" id="email-link" href="tel:+12023908988">
      Call the club
    </a>
    <div class="phone">
      <small>PREFER TO CALL?</small>
      <a href="tel:+12023908988">(202) 390-8988</a>
    </div>
  </div>
</section>
`;
